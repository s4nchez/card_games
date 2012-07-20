$LOAD_PATH.unshift(File.dirname(__FILE__)+"/../spec/")  # required by rake

require 'spec_helper'

require 'game_state'

describe 'GameState' do

  before do
    @state = CardGames::GameState.new([1,2,3,4,5], [0,0])
  end

  it "should allow repositioning group" do
    @state.reposition("g1", 10,15)
    @state.groups["g1"][:x].should == 10
    @state.groups["g1"][:y].should == 15

  end

  it "should allow restyling group" do
    @state.restyle("g1", "side_by_side_vertical")
    @state.groups["g1"][:style].should == "side_by_side_vertical"
  end

  describe "creating new groups" do
    it "should create new group with next id" do
      @state.create_group("g1", [3], [50,51])
      @state.groups["g1"][:cards].should_not include(3)
      new_group = @state.groups["g2"]
      new_group.should_not be_nil
      new_group[:cards].should == [3]
      new_group[:x].should == 50
      new_group[:y].should == 51
    end

    it "should remove previous group if becomes empty" do
      @state.create_group("g1", [1,2,3,4,5], [50,51])
      @state.groups["g1"].should be_nil
    end

  end

end
