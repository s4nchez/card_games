module CardGames
  class Engine
    def initialize(messaging, state)
      @messaging = messaging
      @state = state
    end

    def process_command(player, command, *details)
      if command == "move_group"
        handle_move(player, details)
        return
      end
      @messaging.send(player, command)
    end

    def handle_move(player, details)
      return invalid_command(player, "missing arguments (received #{details})") if details.length != 3
      group_id, x, y = details
      @state.reposition(group_id, x, y)
      @messaging.send(player, {
          :message_type => "group_moved",
          :details => {
              :group_id => group_id,
              :x => x,
              :y => y
          }
      })
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
