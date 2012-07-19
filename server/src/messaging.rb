module CardGames
  class Messaging
    def initialize
      @messages = {}
    end

    def messages_for(target)
      @messages[target] = [] unless @messages.has_key? target
      @messages[target]
    end

    def send(target, message)
      messages_for(target) << message
    end

    def send_multiple(targets, message)
      targets.each { |target| send(target, message) }
    end

    def query(target)
      messages = messages_for(target).clone
      messages_for(target).clear
      { :target => target,
        :messages => messages }
    end
  end
end
