$LOAD_PATH.unshift(File.dirname(__FILE__)+"/../spec/") # required by rake

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
    @state.expects(:players).returns(%w(p1 p2))
    @messaging.expects(:send_multiple).with(%w(p1 p2), {
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

  it "should create new group and notify other players" do
    @state.expects(:players).returns(%w(p1 p2))
    @state.expects(:create_group).returns("new_id")
    @state.expects(:groups).returns({})
    @messaging.expects(:send_multiple).with(%w(p2), {:message_type=> 'group_created', :details => nil})
    @engine.create_group("p1", "src", 1, [1, 2]).should == "new_id"
  end

  it "should send invalid command if failed to create group" do
    @state.expects(:create_group).raises("some error")
    @messaging.expects(:send).with("p1", {
        :message_type => "invalid_command",
        :details => {
            :error => "some error"
        }
    })
    @engine.create_group("p1", "src", 1, [1, 2])
  end
end
