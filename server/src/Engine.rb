module CardGames
  class Engine
    def initialize(messaging, state)
      @messaging = messaging
      @state = state
    end

    def process_command(player, command, *details)
      self.send(command, player, details)
    end

    def reposition_group(player, details)
      return invalid_command(player, "missing arguments (received #{details})") if details.length != 3
      group_id, x, y = details[0], details[1].to_i, details[2].to_i
      @state.reposition(group_id, x, y)

      @messaging.send_multiple(@state.players, {
          :message_type => "group_repositioned",
          :details => {
              :group_id => group_id,
              :x => x,
              :y => y
          }
      })
    end

    def restyle_group(player, details)
      return invalid_command(player, "missing arguments (received #{details})") if details.length != 2
      group_id, style_name = details
      @state.restyle(group_id, style_name)

      @messaging.send_multiple(@state.players, {
          :message_type => "group_restyled",
          :details => {
              :group_id => group_id,
              :style_name => style_name
          }
      })
    end

    def create_group(player, source_group, card_id, position)
      begin
        new_group_id = @state.create_group(source_group, card_id, position)
        others = @state.players.select { |p| p != player }
        @messaging.send_multiple(others, {
            :message_type => "group_created",
            :details => @state.groups[new_group_id]
        })
        new_group_id
      rescue RuntimeError => error
        invalid_command(player, error.message)
      end
    end

    def move_card(player, source_group_id, target_group_id, target_idx, card_id)
      begin
        @state.move_card(source_group_id, target_group_id, target_idx, card_id)
      rescue RuntimeError => error
        invalid_command(player, error.message)
      end
    end

    def invalid_command(player, error)
      @messaging.send(player, {
          :message_type => "invalid_command",
          :details => {
              :error => error
          }
      })
    end
  end
end
