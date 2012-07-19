module CardGames
  class Engine
    def initialize(messaging, state)
      @messaging = messaging
      @state = state
    end

    def process_command(player, command, *details)
      if command == "reposition_group"
        handle_move(player, details)
        return
      end
      @messaging.send(player, command)
    end

    def handle_move(player, details)
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

    def create_group(source_group, card_id, position)
      return @state.create_group(source_group, [card_id], position)
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
