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
      begin
        result = @state.reposition(group_id, x, y)

        @messaging.send_multiple(@state.players, {
            :message_type => "group_repositioned",
            :actor => player,
            :details => result
        })
      rescue RuntimeError => error
        invalid_command(player, error.message)
      end
    end

    def restyle_group(player, details)
      return invalid_command(player, "missing arguments (received #{details})") if details.length != 2
      begin
        group_id, style_name = details
        result = @state.restyle(group_id, style_name)

        @messaging.send_multiple(@state.players, {
            :message_type => "group_restyled",
            :actor => player,
            :details => result
        })
      rescue RuntimeError => error
        invalid_command(player, error.message)
      end
    end

    def create_group(player, source_group_id, card_idx, position)
      begin
        result = @state.create_group(source_group_id, card_idx, position)
        @messaging.send_multiple @state.players, {
            :message_type => "group_created",
            :actor => player,
            :details => result
        }
      rescue RuntimeError => error
        invalid_command(player, error.message)
      end
    end

    def move_card(player, source_group_id, source_group_card_idx, target_group_id, target_group_card_idx)
      begin
        result = @state.move_card(source_group_id, source_group_card_idx, target_group_id, target_group_card_idx)
        @messaging.send_multiple @state.players, {
            :message_type => "card_moved",
            :actor => player,
            :details => result
        }
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
