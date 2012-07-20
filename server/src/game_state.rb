module CardGames
  require 'logger'

  class GameState
    attr_reader :groups, :players

    def initialize
      @logger = Logger.new(STDOUT)
      @players = []
      @groups = {
          "g1" => {
              :group_id => "g1",
              :cards => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              :style => "stack",
              :x => 10,
              :y => 10
          },
          "g2" => {
              :group_id => "g2",
              :cards => [11, 12, 13, 14, 15],
              :style => "side_by_side_horizontal",
              :x => 140,
              :y => 140
          }
      }
      @group_seq = 3
    end

    def create_group(source_group_id, card_ids, position)
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
        :style => "stack",
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
      @players << player_session
    end
  end
end
