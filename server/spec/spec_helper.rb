$LOAD_PATH.unshift(File.dirname(__FILE__)+"/../src")

require 'mocha'

RSpec.configure do |config|
  config.mock_with :mocha
end
