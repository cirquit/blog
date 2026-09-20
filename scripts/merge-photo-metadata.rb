#!/usr/bin/env ruby
# Merge one photo's metadata into a gallery's or post's YAML front matter.
# Called by scripts/make-photo.sh -- not meant to be run standalone.
#
# Usage: merge-photo-metadata.rb <target.md> <slug> <basename> <alt> <exif.json>
#
# Creates or updates front_matter['photos'][slug] = { basename, alt, note, exif }.
# Preserves an existing `note` for that slug across re-runs -- it's the one
# field a human edits by hand, everything else is machine-managed.

require 'yaml'
require 'json'
require 'date'

target_file, slug, basename, alt, exif_json_file = ARGV
unless exif_json_file
  abort "Usage: #{$0} <target.md> <slug> <basename> <alt> <exif.json>"
end

raw = File.read(target_file)
match = raw.match(/\A---\n(.*?)\n---\n(.*)\z/m)
abort "#{target_file}: no YAML front matter found" unless match

front_matter = YAML.safe_load(match[1], permitted_classes: [Date, Time]) || {}
body = match[2]

exif_raw = (JSON.parse(File.read(exif_json_file)).first || {})

def fnumber_to_aperture(v)
  return nil unless v
  "f/#{v}"
end

exif = {
  'camera'       => [exif_raw['Make'], exif_raw['Model']].compact.join(' ').strip,
  'lens'         => exif_raw['LensModel'],
  'aperture'     => fnumber_to_aperture(exif_raw['FNumber']),
  'shutter'      => exif_raw['ExposureTime'] || exif_raw['ShutterSpeed'],
  'iso'          => exif_raw['ISO'],
  'focal_length' => exif_raw['FocalLength'],
  'captured_at'  => exif_raw['DateTimeOriginal']&.sub(/\A(\d{4}):(\d{2}):(\d{2})/, '\1-\2-\3'),
}.reject { |_, v| v.nil? || v == '' }

front_matter['photos'] ||= {}
existing = front_matter['photos'][slug] || {}

front_matter['photos'][slug] = {
  'basename' => basename,
  'alt'      => alt,
  'note'     => existing['note'] || '',
  'exif'     => exif,
}

File.write(target_file, "---\n#{YAML.dump(front_matter).sub(/\A---\n/, '')}---\n#{body}")

puts "Updated #{target_file}: photos.#{slug}"
