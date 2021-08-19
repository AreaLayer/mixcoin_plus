# frozen_string_literal: true

# == Schema Information
#
# Table name: applet_activities
#
#  id         :uuid             not null, primary key
#  result     :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  applet_id  :uuid             not null
#
# Indexes
#
#  index_applet_activities_on_applet_id  (applet_id)
#
class AppletActivity < ApplicationRecord
end
