require 'jasmine'
load 'jasmine/tasks/jasmine.rake'

require 'rspec/core/rake_task'
desc "Run specs"
RSpec::Core::RakeTask.new('rspec') do |t|
  t.pattern = "server/spec/**/*_spec.rb"
end

task :jslint do
  %x(jslint)
end

task :runall => %w(rspec jasmine:ci)

task :default  => :runall