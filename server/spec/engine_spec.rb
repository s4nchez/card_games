require 'spec_helper'

require 'engine'

describe 'Engine' do

  before do
    @messaging = mock('messaging')
    @engine = CardGames::Engine.new(@messaging)
  end

  it "should handle moving groups" do
    @messaging.expects(:send).with("p1", {
        :message_type => "group_moved",
        :details => {
            :group_id => "g1",
            :x => 5,
            :y => 10
        }
    })
    @engine.process_command("p1", "move_group", "g1", 5, 10)
  end

  it "should handle invalid group moving" do
    @messaging.expects(:send).with("p1", {
        :message_type => "invalid_command",
        :details => {
            :error => "missing arguments (received [])"
        }
    })
    @engine.process_command("p1", "move_group")
  end

end
