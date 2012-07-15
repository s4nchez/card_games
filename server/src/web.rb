require 'sinatra'
require 'sinatra/config_file'
require 'json'

require_relative 'engine'
require_relative 'messaging'

enable :sessions
set :logging, true

messaging = CardGames::Messaging.new
engine = CardGames::Engine.new(messaging)

def player_session
  session[:player] = (0...8).map{65.+(rand(25)).chr}.join unless session.has_key? :player
end

get '/command/:command' do
  details = []
  details = params["details"].split(",") if params.has_key? "details"
  engine.process_command(player_session, params[:command], *details)
  JSON({:result => 'ok'})
end

get '/query/' do
  JSON(messaging.query(player_session))
end
