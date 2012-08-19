module CardGames
  require 'logger'
  require 'securerandom'

  class GameState
    attr_reader :groups, :players

    def initialize(initial_cards = ["AS", "AC", "AD", "AH", "KS", "KC", "KD", "KH", "QS", "QC", "QD", "QH", "JS", "JC", "JD", "JH"],
                    initial_position = [10,10], hidden_card = "back", ownership={ :type => :all })
      @logger = Logger.new(STDOUT)
      @players = []
      @group_seq = 0
      @groups = {}
      @hidden_card = hidden_card
      initial_group = new_group(generate_id, "stack", initial_position, ownership)
      initial_group[:cards].concat initial_cards
    end

    def generate_id
      SecureRandom.hex
    end

    def new_group(group_id, style, position, ownership={ :type => :all })
      x,y = position
      group = {
          :cards => [],
          :style => style,
          :x => x,
          :y => y,
          :ownership => ownership
      }
      @groups[group_id] = group
      group
    end

    def create_group(source_group_id, card_idx, position, style = "stack")
      raise "source group not found: #{source_group_id}" if !@groups.has_key? source_group_id
      source_group = @groups[source_group_id]
      raise "invalid card index: #{card_idx}" if source_group[:cards][card_idx].nil?

      card = source_group[:cards][card_idx]
      delete_card_from_group source_group_id, card
      target_group_new_id = generate_id
      new_group = new_group(target_group_new_id, style, position, source_group[:ownership])
      new_group[:cards] << card
      source_group_new_id = update_group source_group, source_group_id

      result = {
          :source_group_old_id => source_group_id,
          :source_group_new_id => source_group_new_id,
          :target_group_new_id => target_group_new_id,
          :card => card,
          :x => new_group[:x],
          :y => new_group[:y]
      }

      ownership_result(result, new_group[:ownership])
    end

    def ownership_result(result, ownership)
      {
        :all => { :others => result },
        :single_player => {
          :others => result.merge({ :card => @hidden_card }),
          ownership[:player] => result
        },
        :none => { :others => result.merge({ :card => @hidden_card }) }
      }[ownership[:type]]
    end

    def ownership_group(group, player)
      masked_group = group.merge({ :cards => [@hidden_card] * group[:cards].length })

      {
        :all => group,
        :single_player => player == group[:ownership][:player] ? group : masked_group,
        :none => masked_group
      }[group[:ownership][:type]]
    end

    def move_card(source_group_id, source_card_idx, target_group_id, target_card_idx)
       raise "source group not found: #{source_group_id}" if !@groups.has_key? source_group_id
       source_group = @groups[source_group_id]
       raise "invalid source card index: #{source_card_idx}" if source_group[:cards][source_card_idx].nil?
       target_group = @groups[target_group_id]
       raise "target group not found: #{target_group_id}" if !target_group
       raise "invalid target card index: #{target_card_idx}" if target_card_idx > target_group[:cards].length

       card = source_group[:cards][source_card_idx]
       delete_card_from_group source_group_id, card
       source_group_new_id = update_group source_group, source_group_id
       target_group[:cards].insert(target_card_idx, card)
       if source_group_id != target_group_id
         target_group_new_id = update_group target_group, target_group_id
       else
         target_group_new_id = source_group_new_id
       end

       {
           :source_group_old_id => source_group_id,
           :source_group_new_id => source_group_new_id,
           :source_card_idx => source_card_idx,
           :target_group_old_id => target_group_id,
           :target_group_new_id => target_group_new_id,
           :target_card_idx => target_card_idx,
           :card => card
       }
     end

    def reposition(group_id, x, y)
      raise "group not found: #{group_id}" if !@groups.has_key? group_id
      group = @groups[group_id]
      group[:x] = x
      group[:y] = y
      group_new_id = update_group group, group_id

      {
        :group_old_id => group_id,
        :group_new_id => group_new_id,
        :x => x,
        :y => y
      }
    end

    def restyle(group_id, style_name)
      raise "group not found: #{group_id}" if !@groups.has_key? group_id
      group = @groups[group_id]
      group[:style] = style_name
      group_new_id = update_group group, group_id

      {
        :group_old_id => group_id,
        :group_new_id => group_new_id,
        :style_name => style_name
      }
    end

    def current_state(player)
      current_state = []
      groups.map do |group_id, group|
        group[:group_id] = group_id
        current_state << ownership_group(group, player)
      end
      result = {
        :player => player,
        :current_state => current_state
      }
    end

    def player_active(player_session)
      @players << player_session unless @players.include? player_session
    end

    def update_group(group, current_group_id)
      return nil if !@groups.has_key? current_group_id
      new_group_id = generate_id
      @groups[new_group_id] = group
      @groups.delete current_group_id
      new_group_id
    end

    def delete_card_from_group(group_id, card)
      group = @groups[group_id]
      group[:cards].delete card
      if group[:cards].empty?
        @groups.delete(group_id)
      end
    end

  end
end
