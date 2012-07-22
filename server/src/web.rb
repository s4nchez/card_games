require 'sinatra'
require 'sinatra/config_file'
require 'json'

require_relative 'engine'
require_relative 'game_state'
require_relative 'messaging'

set :public_folder, '../client'

enable :sessions
set :logging, true

messaging = CardGames::Messaging.new
state = CardGames::GameState.new
engine = CardGames::Engine.new(messaging, state)

def player_session
  session[:player] = (0...8).map{65.+(rand(25)).chr}.join unless session.has_key? :player
  session[:player]
end

get '/' do
  redirect '/index.html'
end

get '/command/:command' do
  details = []
  details = params["details"].split(",") if params.has_key? "details"
  engine.process_command(player_session, params[:command], *details)
  JSON({:result => 'ok'})
end

post '/command/group' do
  logger.info { "/command/group received #{params}" }

  source_group_id = params[:sourceGroupId]
  card_id = params[:cardId]
  position = params[:cardPosition].map {|n| n.to_i}

  new_group_id = engine.create_group(player_session, source_group_id, card_id, position)
  JSON({:newGroupId => new_group_id})
end

post '/command/movecard' do
  logger.info { "/command/movecard received #{params}" }

  source_group_id = params[:sourceGroupId]
  target_group_id = params[:targetGroupId]
  target_idx = params[:targetIdx].to_i
  card_id = params[:cardId]

  engine.move_card(player_session, source_group_id, target_group_id, target_idx, card_id)
  JSON({:result => 'ok'})
end

get '/query' do
  JSON(messaging.query(player_session))
end

get '/current-state' do
  state.player_active(player_session);
  current_state = state.groups.values
  logger.info { "#{current_state}" }
  JSON(current_state)
end
