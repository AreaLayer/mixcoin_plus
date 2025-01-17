# frozen_string_literal: true

# == Schema Information
#
# Table name: mixin_network_snapshots
#
#  id             :uuid             not null, primary key
#  amount         :decimal(, )
#  amount_usd     :decimal(, )      default(0.0)
#  data           :string
#  processed_at   :datetime
#  raw            :json
#  snapshot_type  :string
#  source_type    :string
#  transferred_at :datetime
#  type           :string
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  asset_id       :uuid
#  opponent_id    :uuid
#  snapshot_id    :uuid
#  source_id      :uuid
#  trace_id       :uuid
#  user_id        :uuid
#
# Indexes
#
#  index_mixin_network_snapshots_on_source_id_and_source_type  (source_id,source_type)
#  index_mixin_network_snapshots_on_trace_id                   (trace_id) UNIQUE
#  index_mixin_network_snapshots_on_user_id                    (user_id)
#
class MixinNetworkSnapshot < ApplicationRecord
  POLLING_INTERVAL = 0.1
  POLLING_LIMIT = 500

  belongs_to :source, polymorphic: true, optional: true
  belongs_to :wallet, class_name: 'MixinNetworkUser', foreign_key: :user_id, primary_key: :mixin_uuid, inverse_of: :snapshots, optional: true
  belongs_to :opponent, class_name: 'User', primary_key: :mixin_uuid, inverse_of: :snapshots, optional: true
  belongs_to :asset, class_name: 'MixinAsset', primary_key: :asset_id, inverse_of: false, optional: true

  after_initialize :setup_attributes, if: :new_record?

  validates :amount, presence: true
  validates :asset_id, presence: true
  validates :user_id, presence: true
  validates :snapshot_id, presence: true
  validates :trace_id, presence: true

  after_commit :process_async, on: :create

  scope :unprocessed, -> { where(processed_at: nil) }
  scope :only_input, -> { where(amount: 0...) }
  scope :only_output, -> { where(amount: ...0) }
  scope :within_24h, -> { where(created_at: (Time.current - 24.hours)...) }

  # polling Mixin Network
  # should be called in a event machine
  def self.poll
    loop do
      offset = Global.redis.get('last_polled_at')
      offset = MixinNetworkSnapshot.order(transferred_at: :desc).first&.transferred_at&.utc&.rfc3339 || Time.current.utc.rfc3339 if offset.blank?

      r = MixcoinPlusBot.api.read_network_snapshots(offset: offset, limit: POLLING_LIMIT, order: 'ASC')
      p "polled #{r['data'].length} mixin network snapshots, #{offset}"

      r['data'].each do |snapshot|
        next if snapshot['user_id'].blank?

        create_with(raw: snapshot).find_or_create_by!(trace_id: snapshot['trace_id'])
      end

      Global.redis.set 'last_polled_at', r['data'].last['created_at']

      sleep 0.5 if r['data'].length < POLLING_LIMIT
      sleep POLLING_INTERVAL
    rescue StandardError => e
      p e.inspect
    end
  end

  def owner
    @owner = wallet&.owner
  end

  def processed?
    processed_at?
  end

  def process!
    return if processed?

    raise 'No Processor Implemented!' unless data.to_s.downcase.match?(/fee|commission|withdraw|arbitrage|deposit/) || data.blank? || user_id == MixcoinPlusBot.api.client_id

    process_booking_order_activit_bonus_snapshot

    touch_proccessed_at
  end

  def process_booking_order_activit_bonus_snapshot
    return unless data.to_s.match?(/^Bonus/)

    participant = BookingOrderActivityParticipant.find_by(id: trace_id)
    participant.complete! if participant&.may_complete?
  end

  def touch_proccessed_at
    update(
      processed_at: Time.current,
      amount_usd: asset.price_usd.to_f * amount
    )
  end

  def process_async
    MixinNetworkSnapshotProcessWorker.perform_async id
  end

  def base64_decoded_memo
    @base64_decoded_memo = Base64.decode64(data.to_s.gsub('-', '+').gsub('_', '/'))
  end

  def decrypted_msgpack_memo
    decrypted_msgpack_memo = MessagePack.unpack base64_decoded_memo

    if decrypted_msgpack_memo.present?
      decrypted_msgpack_memo['A'] = raw_to_uuid(decrypted_msgpack_memo['A'])
      decrypted_msgpack_memo['B'] = raw_to_uuid(decrypted_msgpack_memo['B'])
      decrypted_msgpack_memo['O'] = raw_to_uuid(decrypted_msgpack_memo['O'])
    end

    decrypted_msgpack_memo
  rescue StandardError
    {}
  end

  def decrypted_json_memo
    JSON.parse base64_decoded_memo
  rescue JSON::ParserError
    {}
  end

  def decrypted_memo
    @decrypted_memo ||= decrypted_msgpack_memo
    @decrypted_memo = decrypted_json_memo if @decrypted_memo.blank?

    @decrypted_memo
  end

  def raw_to_uuid(raw)
    return if raw.nil?

    case raw
    when String
      raw = raw.bytes.pack('c*')
    when Array
      raw = raw.pack('c*')
    end

    return raw if raw == '00000000-0000-0000-0000-000000000000'
    return raw if raw.match?(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    raw = raw.unpack1('H*').to_s
    format(
      '%<first>s-%<second>s-%<third>s-%<forth>s-%<fifth>s',
      first: raw[0..7],
      second: raw[8..11],
      third: raw[12..15],
      forth: raw[16..19],
      fifth: raw[20..]
    )
  rescue StandardError
    nil
  end

  def decrypted_snapshot_type
    @_decrypted_snapshot_type ||=
      if base64_decoded_memo.match?(/^OCEAN/)
        case base64_decoded_memo.split('|')[1]
        when 'REFUND', 'CANCEL'
          'refund_to_user'
        when 'MATCH'
          'match_to_user'
        when 'CREATE'
          'create_order_from_user'
        when 'BALANCE'
          'ocean_broker_balance'
        end
      elsif decrypted_msgpack_memo.present?
        if raw['amount'].to_f.negative?
          # to engine
          return 'ocean_broker_register' if decrypted_msgpack_memo['U'].present?
          return 'cancel_order_to_engine' if decrypted_msgpack_memo['O'].present?
          return 'create_order_to_engine' if decrypted_msgpack_memo['A'].present?
        else
          # from engine
          case decrypted_msgpack_memo['S']
          when 'CANCEL', 'REFUND'
            'refund_from_engine'
          when 'MATCH'
            'match_from_engine'
          end
        end
      end
    @_decrypted_snapshot_type
  end

  private

  def setup_attributes
    return unless new_record?

    assign_attributes(
      asset_id: raw['asset']&.[]('asset_id') || raw['asset_id'],
      amount: raw['amount'],
      data: raw['data'] || raw['memo'],
      transferred_at: raw['created_at'],
      user_id: raw['user_id'],
      opponent_id: raw['opponent_id'],
      snapshot_id: raw['snapshot_id'],
      trace_id: raw['trace_id']
    )

    self.type = 'OceanSnapshot' if decrypted_msgpack_memo.present? || base64_decoded_memo.match?(/^OCEAN/)
    self.type = 'IfttbSnapshot' if base64_decoded_memo.match?(/^IFTTB/)
    self.type = 'SwapSnapshot' if decrypted_json_memo.present? || base64_decoded_memo.split('|')[0].in?(%w[SWAP 0 1]) || (amount.negative? && opponent_id.blank?)
  end
end
