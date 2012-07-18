$LOAD_PATH.unshift(File.dirname(__FILE__)+"/../spec/")  # required by rake

require 'spec_helper'

require 'engine'

describe 'Engine' do

  before do
    @messaging = mock('messaging')
    @state = mock('state')
    @engine = CardGames::Engine.new(@messaging, @state)
  end

  it "should handle moving groups" do
    @state.expects(:reposition).with("g1", 5, 10)
    @messaging.expects(:send).with("p1", {
        :message_type => "group_repositioned",
        :details => {
            :group_id => "g1",
            :x => 5,
            :y => 10
        }
    })
    @engine.process_command("p1", "reposition_group", "g1", 5, 10)
  end

  it "should handle invalid group moving" do
    @messaging.expects(:send).with("p1", {
        :message_type => "invalid_command",
        :details => {
            :error => "missing arguments (received [])"
        }
    })
    @engine.process_command("p1", "reposition_group")
  end

  # it "move card"
  # it "group style change"

end
