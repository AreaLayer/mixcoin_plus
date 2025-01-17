# frozen_string_literal: true

class MixinNetworkSnapshotProcessWorker
  include Sidekiq::Worker
  sidekiq_options queue: :critical, retry: true

  def perform(id)
    MixinNetworkSnapshot.find_by(id: id)&.process!
  end
end
