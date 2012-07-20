module CardGames
  require 'logger'

  class GameState
    attr_reader :groups, :players

    def initialize(initial_cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                    initial_position = [10,10])
      @logger = Logger.new(STDOUT)
      @players = []
      @group_seq = 0
      @groups = {}
      new_group("stack", initial_position)
      @groups["g1"][:cards].concat initial_cards
    end

    def new_group(style, position)
      @group_seq += 1
      new_group_id = "g#@group_seq"
      @logger.info { "group_id = #{new_group_id}" }
      x,y = position
      group = {
          :group_id => new_group_id,
          :cards => [],
          :style => style,
          :x => x,
          :y => y
      }
      @groups[new_group_id] = group
      group
    end

    def create_group(source_group_id, card_id, position, style = "stack")
      raise "source group not found" if !@groups.has_key? source_group_id
      source_group = @groups[source_group_id]
      raise "card was not found in source group" if !source_group[:cards].include? card_id

      source_group[:cards].delete card_id

      if source_group[:cards].empty?
        @groups.delete(source_group_id)
      end

      new_group = new_group(style, position)
      new_group[:cards] << card_id
      new_group[:group_id]
    end

    def reposition(group_id, x, y)
      @logger.info { "#{__method__}: group_id = #{group_id}" }
      group = @groups[group_id]
      if group
        group[:x] = x
        group[:y] = y
      end
    end

    def restyle(group_id, style_name)
      @logger.info { "#{__method__}: group_id = #{group_id}" }
      group = @groups[group_id]
      if group
        group[:style] = style_name
      end
    end

    def player_active(player_session)
      @players << player_session unless @players.include? player_session
    end
  end
end
