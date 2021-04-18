# frozen_string_literal: true

module Resolvers
  class AdminOceanOrderConnectionResolver < Resolvers::AdminBaseResolver
    argument :after, String, required: false
    argument :query, String, required: false
    argument :state, String, required: false
    argument :conversation_id, ID, required: false
    argument :market_id, ID, required: false
    argument :user_id, ID, required: false

    type Types::OceanOrderType.connection_type, null: false

    def resolve(**params)
      user = User.find_by(id: params[:user_id])
      orders =
        if user.present?
          user.ocean_orders
        else
          OceanOrder.all
        end

      orders =
        if params[:market_id].present?
          orders.where(market_id: params[:market_id])
        else
          orders
        end

      orders = orders.where(conversation_id: params[:conversation_id]) if params[:conversation_id].present?

      state = params[:state] || 'valid'
      orders =
        case state
        when 'valid'
          orders.without_drafted
        else
          orders.where(state: params[:state])
        end

      query = params[:query].to_s.strip
      q_ransack = { trace_id_eq: query }
      orders.ransack(q_ransack.merge(m: 'or')).result.order(created_at: :desc)
    end
  end
end
