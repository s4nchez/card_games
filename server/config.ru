$LOAD_PATH.unshift(File.dirname(__FILE__)+"/src")

require 'web'

def app
  CardGames::Web
end

map "/" do
  run CardGames::Web
end