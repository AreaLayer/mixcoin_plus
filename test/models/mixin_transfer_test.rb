# frozen_string_literal: true

# == Schema Information
#
# Table name: mixin_transfers
#
#  id            :bigint           not null, primary key
#  amount        :decimal(, )
#  memo          :string
#  priority      :integer
#  processed_at  :datetime
#  snapshot      :json
#  source_type   :string
#  transfer_type :integer
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  asset_id      :uuid
#  opponent_id   :uuid
#  source_id     :bigint
#  trace_id      :uuid
#  user_id       :uuid
#
# Indexes
#
#  index_mixin_transfers_on_source    (source_type,source_id)
#  index_mixin_transfers_on_trace_id  (trace_id) UNIQUE
#  index_mixin_transfers_on_user_id   (user_id)
#
require 'test_helper'

class MixinTransferTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
