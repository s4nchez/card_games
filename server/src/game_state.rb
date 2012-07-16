module CardGames
  class GameState
    attr_reader :groups

    def initialize
      @groups = [
          {
              :group_id => "g1",
              :cards => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              :style => "stack",
              :x => 10,
              :y => 10
          },
          {
              :group_id => "g2",
              :cards => [11, 12, 13, 14, 15],
              :style => "side_by_side_horizontal",
              :x => 140,
              :y => 140
          }
      ]
    end

    def reposition(group_id, x, y)
      @groups.each do |group|
        if group[:group_id] == group_id
          group[:x] = x
          group[:y] = y
        end
      end
    end
  end
end