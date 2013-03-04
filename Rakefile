require 'jasmine'
load 'jasmine/tasks/jasmine.rake'

require 'rspec/core/rake_task'
desc "Run specs"
RSpec::Core::RakeTask.new('rspec') do |t|
  t.pattern = "server/spec/**/*_spec.rb"
end

desc "Run jslint"
task :jslint do
  sh %{jslint client/src/*.js} do |ok, res|
      puts "jslint checks failed." if !ok
  end
end

task :runall => %w(rspec jasmine:ci)

task :travis do
  ["rake rspec", "rake jasmine:ci"].each do |cmd|
    puts "Starting to run #{cmd}..."
    system("export DISPLAY=:99.0 && #{cmd}")
    raise "#{cmd} failed!" unless $?.exitstatus == 0
  end
end

task :default  => :runall

