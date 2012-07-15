require 'sinatra'
require 'sinatra/config_file'
require 'json'

require_relative 'engine'
require_relative 'messaging'

set :public_folder, '../client'

enable :sessions
set :logging, true

messaging = CardGames::Messaging.new
engine = CardGames::Engine.new(messaging)

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

get '/query/' do
  JSON(messaging.query(player_session))
end

get '/current-state' do
  JSON([
    {
      :cards => [1,2,3,4,5,6,7,8,9,10],
      :style => "stack",
      :x => 10,
      :y => 10
    },
    {
      :cards => [11,12,13,14,15],
      :style => "side_by_side_horizontal",
      :x => 140,
      :y => 140
    }
  ])
end
