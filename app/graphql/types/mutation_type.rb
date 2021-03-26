# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject
    # admin
    field :admin_login, mutation: Mutations::AdminLoginMutation

    # application
    field :switch_locale, mutation: Mutations::SwitchLocaleMutation
    field :create_ocean_order, mutation: Mutations::CreateOceanOrderMutation
    field :cancel_ocean_order, mutation: Mutations::CancelOceanOrderMutation
    field :favorite_ocean_market, mutation: Mutations::FavoriteOceanMarketMutation
    field :unfavorite_ocean_market, mutation: Mutations::UnfavoriteOceanMarketMutation
  end
end
