$LOAD_PATH.unshift(File.dirname(__FILE__)+"/../spec/") # required by rake

require 'spec_helper'

require 'game_state'

describe 'GameState' do

  before do
    SecureRandom.stubs(:hex).returns(*%w(g1 g2 g3 g4 g5 g6 g7 g8 g9 g10))
    @state = CardGames::GameState.new(%w(AC 2H 3D 4S 5D), [0, 0], :back, { :type => :all })
  end

  it "should allow repositioning group" do
    result = @state.reposition("g1", 10, 15)
    @state.groups["g1"].should be_nil
    @state.groups["g2"][:x].should == 10
    @state.groups["g2"][:y].should == 15
    result.should == {
      :group_old_id => "g1",
      :group_new_id => "g2",
      :x => 10,
      :y => 15
    }
  end

  it "should throw exception if trying to reposition non existent group" do
    lambda {
      @state.reposition("g2", 10, 15)
    }.should raise_error("group not found: g2")
  end

  it "should allow restyling group" do
    result = @state.restyle("g1", "side_by_side_vertical")
    @state.groups["g1"].should be_nil
    @state.groups["g2"][:style].should == "side_by_side_vertical"
    result.should == {
      :group_old_id => "g1",
      :group_new_id => "g2",
      :style_name => "side_by_side_vertical",
    }
  end

  it "should throw exception if trying to restyle non existent group" do
    lambda {
      @state.restyle("g2", "side_by_side_vertical")
    }.should raise_error("group not found: g2")
  end

  describe "creating new group" do
    it "should move card to newly created group and update source group id" do
      result = @state.create_group("g1", 3, [50, 51])
      result[:others].should == {
          :source_group_old_id => "g1",
          :source_group_new_id => "g3",
          :target_group_new_id => "g2",
          :card => "4S",
          :x => 50,
          :y => 51
      }
      @state.groups["g1"].should be_nil
      @state.groups["g2"][:cards].should == %w(4S)
      @state.groups["g3"][:cards].should == %w(AC 2H 3D 5D)
    end

    it "should maintain the player owner for a new group" do
      @state.groups["g1"][:ownership] = { :type => :single_player, :player => :someone }
      result = @state.create_group("g1", 3, [50, 51])
      result[:others].should == {
          :source_group_old_id => "g1",
          :source_group_new_id => "g3",
          :target_group_new_id => "g2",
          :card => :back,
          :x => 50,
          :y => 51
      }
      result[:someone].should == {
          :source_group_old_id => "g1",
          :source_group_new_id => "g3",
          :target_group_new_id => "g2",
          :card => "4S",
          :x => 50,
          :y => 51
      }
    end

    it "should maintain no owner for a new group" do
      @state.groups["g1"][:ownership] = { :type => :none }
      result = @state.create_group("g1", 3, [50, 51])
      result[:others].should == {
          :source_group_old_id => "g1",
          :source_group_new_id => "g3",
          :target_group_new_id => "g2",
          :card => :back,
          :x => 50,
          :y => 51
      }
    end

    it "should remove source group if becomes empty" do
      @state.create_group("g1", 0, [50, 51])
      @state.create_group("g3", 0, [50, 51])
      @state.create_group("g5", 0, [50, 51])
      @state.create_group("g7", 0, [50, 51])
      @state.create_group("g9", 0, [50, 51])
      @state.groups.length.should === 5
    end

    it "should throw exception if source group does not exist" do
      lambda {
        @state.create_group("g2", 3, [50, 51])
      }.should raise_error("source group not found: g2")
    end

    it "should throw exception if card index is invalid" do
      lambda {
        @state.create_group("g1", 6, [50, 51])
      }.should raise_error("invalid card index: 6")
    end

  end

  describe "moving card between groups" do

    before do
      SecureRandom.stubs(:hex).returns(*%w(0 g3 g4 g5 g6 g7 g8 g9 g10))
      @state = CardGames::GameState.new(%w(), [0, 0])

    end

    it "should transfer card and update both group ids" do
      @state.groups["g1"] = {
          :cards => %w(AH 2C 3D)
      }
      @state.groups["g2"] = {
          :cards => %w(JH QC KD)
      }
      result = @state.move_card("g1", 0, "g2", 0)
      result.should == {
          :source_group_old_id => "g1",
          :source_group_new_id => "g3",
          :source_card_idx => 0,
          :target_group_old_id => "g2",
          :target_group_new_id => "g4",
          :target_card_idx => 0,
          :card => "AH"
      }
      @state.groups["g1"].should be_nil
      @state.groups["g3"][:cards].should == %w(2C 3D)
      @state.groups["g2"].should be_nil
      @state.groups["g4"][:cards].should == %w(AH JH QC KD)
    end

    it "should move card inside its own group" do
      @state.groups["g1"] = {
          :cards => %w(AH 2C 3D)
      }
      @state.groups["g2"] = {
          :cards => %w(JH QC KD)
      }
      result = @state.move_card("g1", 0, "g1", 0)
      result.should == {
          :source_group_old_id => "g1",
          :source_group_new_id => "g3",
          :source_card_idx => 0,
          :target_group_old_id => "g1",
          :target_group_new_id => "g3",
          :target_card_idx => 0,
          :card => "AH"
      }
      @state.groups["g1"].should be_nil
      @state.groups["g3"][:cards].should == %w(AH 2C 3D)
    end

    it "should remove source group if becomes empty" do
      @state.groups["g1"] = {
          :cards => %w(AH)
      }
      @state.groups["g2"] = {
          :cards => %w(JH QC KD)
      }
      result = @state.move_card("g1", 0, "g2", 0)
      result.should == {
          :source_group_old_id => "g1",
          :source_group_new_id => nil,
          :source_card_idx => 0,
          :target_group_old_id => "g2",
          :target_group_new_id => "g3",
          :target_card_idx => 0,
          :card => "AH"
      }
      @state.groups["g1"].should be_nil
      @state.groups["g2"].should be_nil
      @state.groups["g3"][:cards].should == %w(AH JH QC KD)
    end

    it "should throw exception if source group does not exist" do
      lambda {
        @state.move_card("g7", 0, "g1", 0)
      }.should raise_error("source group not found: g7")
    end

    it "should throw exception if target group does not exist" do
      @state.groups["g1"] = {
          :cards => %w(AH)
      }
      lambda {
        @state.move_card("g1", 0, "g7", 0)
      }.should raise_error("target group not found: g7")
    end

    it "should throw exception if source card index is invalid" do
      @state.groups["g1"] = {
          :cards => %w(AH)
      }
      lambda {
        @state.move_card("g1", 3, "g7", 0)
      }.should raise_error("invalid source card index: 3")
    end

    it "should throw exception if target card index is invalid" do
      @state.groups["g1"] = {
          :cards => %w(AH)
      }
      @state.groups["g2"] = {
          :cards => %w(4D)
      }
      lambda {
        @state.move_card("g1", 0, "g2", 2)
      }.should raise_error("invalid target card index: 2")
    end
  end

  describe "current state" do
    it "returns the initial group" do
      @state.current_state(:someone).should == {
        :player => :someone,
        :current_state =>
         [@state.groups["g1"]]
       }
    end

    it "returns a player owned group for that player" do
      @state.groups["g1"][:ownership] = { :type => :single_player, :player => :someone }
      @state.current_state(:someone).should == {
        :player => :someone,
        :current_state =>
         [@state.groups["g1"]]
       }
    end

    it "returns a player owned group for anyone else" do
      @state.groups["g1"][:ownership] = { :type => :single_player, :player => :someone }
      @state.current_state(:someone_else).should == {
        :player => :someone_else,
        :current_state =>
         [@state.groups["g1"].merge(:cards => [:back] * 5)]
       }
    end

    it "returns a unowned (hidden) group" do
      @state.groups["g1"][:ownership] = { :type => :none }
      @state.current_state(:someone).should == {
        :player => :someone,
        :current_state =>
         [@state.groups["g1"].merge(:cards => [:back] * 5)]
       }
    end
  end
end
