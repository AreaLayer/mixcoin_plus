# frozen_string_literal: true

module Types
  class MixinNetworkUserType < Types::BaseModelObject
    field :id, ID, null: false
    field :uuid, String, null: false
    field :name, String, null: false
  end
end
