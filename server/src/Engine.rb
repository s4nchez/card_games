module CardGames
  class Engine
    def initialize(messaging)
      @messaging = messaging
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
      @messaging.send(player, {
          :message_type => "group_moved",
          :details => {
              :group_id => details[0],
              :x => details[1],
              :y => details[2]
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
