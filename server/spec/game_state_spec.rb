$LOAD_PATH.unshift(File.dirname(__FILE__)+"/../spec/") # required by rake

require 'spec_helper'

require 'game_state'

describe 'GameState' do

  before do
    @state = CardGames::GameState.new([1, 2, 3, 4, 5], [0, 0])
  end

  it "should allow repositioning group" do
    @state.reposition("g1", 10, 15)
    @state.groups["g1"][:x].should == 10
    @state.groups["g1"][:y].should == 15

  end

  it "should allow restyling group" do
    @state.restyle("g1", "side_by_side_vertical")
    @state.groups["g1"][:style].should == "side_by_side_vertical"
  end

  describe "creating new groups" do
    it "should create new group with next id" do
      @state.create_group("g1", 3, [50, 51])
      @state.groups["g1"][:cards].should_not include(3)
      new_group = @state.groups["g2"]
      new_group.should_not be_nil
      new_group[:cards].should == [3]
      new_group[:x].should == 50
      new_group[:y].should == 51
    end

    it "should remove previous group if becomes empty" do
      @state.create_group("g1", 1, [50, 51])
      @state.create_group("g1", 2, [50, 51])
      @state.create_group("g1", 3, [50, 51])
      @state.create_group("g1", 4, [50, 51])
      @state.create_group("g1", 5, [50, 51])
      @state.groups["g1"].should be_nil
    end

    it "should throw exception if source group does not exist" do
      lambda {
        @state.create_group("g2", 3, [50,51])
      }.should raise_error("source group not found")
    end

    it "should throw exception if card not present in source group" do
      lambda {
        @state.create_group("g1", 6, [50,51])
      }.should raise_error("card was not found in source group")
    end

  end

end
