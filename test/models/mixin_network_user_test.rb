# frozen_string_literal: true

# == Schema Information
#
# Table name: mixin_network_users
#
#  id            :uuid             not null, primary key
#  encrypted_pin :string
#  mixin_uuid    :uuid
#  name          :string
#  owner_type    :string
#  pin_token     :string
#  private_key   :string
#  raw           :json
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  owner_id      :bigint
#  session_id    :uuid
#
# Indexes
#
#  index_mixin_network_users_on_mixin_uuid  (mixin_uuid) UNIQUE
#  index_mixin_network_users_on_owner       (owner_type,owner_id)
#
require 'test_helper'

class MixinNetworkUserTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
end
