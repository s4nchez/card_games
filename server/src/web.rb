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

  source_group_id = params[:source_group_id]
  card_idx = params[:card_idx].to_i
  position = params[:position].map {|n| n.to_i}

  new_group_id = engine.create_group(player_session, source_group_id, card_idx, position)
  JSON({:newGroupId => new_group_id})
end

post '/command/movecard' do
  logger.info { "/command/movecard received #{params}" }

  source_group_id = params[:source_group_id]
  target_group_id = params[:target_group_id]
  source_group_card_idx = params[:source_group_card_idx].to_i
  target_group_card_idx = params[:target_group_card_idx].to_i

  engine.move_card(player_session, source_group_id, source_group_card_idx, target_group_id, target_group_card_idx)
  JSON({:result => 'ok'})
end

get '/query' do
  JSON(messaging.query(player_session))
end

get '/current-state' do
  state.player_active(player_session)
  result = state.current_state(player_session)
  logger.info { "#{result}" }
  JSON(result)
end

# required for keep_open
set :server, :thin

get '/message-stream', provides: 'text/event-stream' do
 stream :keep_open do |out|
    messaging.register_client(player_session, lambda { |messages|
      out << "event: messages\n"  
      out << "data: " + JSON(messages) + "\n\n"
      logger.info("Sent message to " + player_session)
    })
    out.callback { messaging.unregister_client(player_session) }
  end
end
