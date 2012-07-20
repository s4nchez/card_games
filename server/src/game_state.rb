module CardGames
  require 'logger'

  class GameState
    attr_reader :groups, :players

    def initialize(initial_cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                    initial_position = [10,10])
      @logger = Logger.new(STDOUT)
      @players = []
      @group_seq = 1
      @groups = {}
      create_group(nil, initial_cards, initial_position)
    end

    def create_group(source_group_id, card_ids, position, style = "stack")
      x, y = position

      # need to remove from source_group_id
      if source_group_id
        source_group = @groups[source_group_id]
        if source_group
          source_group[:cards].delete_if {|card_id| card_ids.include? card_id }
          if source_group[:cards].empty?
            @groups.delete(source_group_id)
          end
        end
      end

      new_group_id = "g#{@group_seq}"
      @group_seq += 1
      @logger.info { "new_group_id = #{new_group_id}" }

      new_group = {
        :group_id => new_group_id,
        :cards => card_ids,
        :style => style,
        :x => x,
        :y => y
      }
      @groups[new_group_id] = new_group
      return new_group_id
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
