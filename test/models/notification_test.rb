# frozen_string_literal: true

# == Schema Information
#
# Table name: notifications
#
#  id             :uuid             not null, primary key
#  params         :jsonb
#  read_at        :datetime
#  recipient_type :string           not null
#  type           :string           not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  recipient_id   :uuid             not null
#
# Indexes
#
#  index_notifications_on_read_at                          (read_at)
#  index_notifications_on_recipient_id_and_recipient_type  (recipient_id,recipient_type)
#
require 'test_helper'

class NotificationTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
