module CardGames
  class Messaging
    def initialize
      @clients = {}
    end

    def register_client(target, send_to_target_fn)
      @clients[target] = send_to_target_fn
    end

    def client_for(target)
      @clients[target]
    end

    def send(target, message)
      client_fn = client_for(target)
      if client_fn
        client_fn.call({
          :target => target,
          :messages => [message] 
        })
      end
    end

    def send_multiple(targets, message)
      targets.each { |target| send(target, message) }
    end
  end
end
