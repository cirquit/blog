#!/usr/bin/env ruby
# frozen_string_literal: true

# One-time convenience: copy images into a gallery and stub out one Markdown
# file per photo. Never overwrites anything. See README "Galleries".
#
#   mise exec -- bundle exec ruby scripts/import-gallery.rb <slug> <image-dir> [--title "Title"]

require "date"
require "fileutils"
require "json"
require "open3"

ROOT = File.expand_path("..", __dir__)
EXTS = %w[.jpg .jpeg .png .webp .avif].freeze

args = ARGV.dup
title = nil
if (i = args.index("--title"))
  title = args[i + 1]
  args.slice!(i, 2)
end
slug, dir = args
abort "usage: import-gallery.rb <slug> <image-dir> [--title \"Title\"]" unless slug && dir && File.directory?(dir)

def q(value) = value.to_s.strip.empty? ? '""' : JSON.generate(value.to_s)

def exif(path)
  return {} unless system("which exiftool > /dev/null 2>&1")

  out, status = Open3.capture2("exiftool", "-json", "-n", path)
  return {} unless status.success?

  JSON.parse(out).first || {}
rescue JSON::ParserError
  {}
end

images = Dir.children(dir).select { |f| EXTS.include?(File.extname(f).downcase) }.sort
abort "no images found in #{dir}" if images.empty?

photo_dir = File.join(ROOT, "_photos", slug)
asset_dir = File.join(ROOT, "assets", "photos", slug)
FileUtils.mkdir_p([photo_dir, asset_dir])

n = Dir.children(photo_dir).filter_map { |f| f[/\A(\d+)\.md\z/, 1]&.to_i }.max || 0

images.each do |file|
  n += 1
  nn = format("%02d", n)
  ext = File.extname(file).downcase
  image = File.join(asset_dir, "#{nn}#{ext}")
  md = File.join(photo_dir, "#{nn}.md")
  if File.exist?(image) || File.exist?(md)
    puts "skip   #{nn} (exists)"
    next
  end

  FileUtils.cp(File.join(dir, file), image)
  e = exif(image)
  f = ->(k) { e[k] }
  aperture = f.("FNumber") && "f/#{f.("FNumber")}"
  shutter = f.("ExposureTime") && (f.("ExposureTime") < 1 ? "1/#{(1 / f.("ExposureTime")).round}" : f.("ExposureTime").to_s)
  focal = f.("FocalLength") && "#{f.("FocalLength").to_s.sub(/\.0\z/, "")} mm"

  File.write(md, <<~MD)
    ---
    gallery: #{slug}
    image: /assets/photos/#{slug}/#{nn}#{ext}
    alt: ""
    note: ""
    place: ""
    camera: #{q(f.("Model"))}
    lens: #{q(f.("LensModel") || f.("LensID"))}
    focal_length: #{q(focal)}
    aperture: #{q(aperture)}
    shutter: #{q(shutter)}
    iso: #{q(f.("ISO"))}
    captured_at: #{q((f.("DateTimeOriginal") || f.("CreateDate"))&.sub(/\A(\d+):(\d+):(\d+)/, '\\1-\\2-\\3'))}
    ---
  MD
  puts "wrote  assets/photos/#{slug}/#{nn}#{ext}"
  puts "wrote  _photos/#{slug}/#{nn}.md"
end

gallery = File.join(ROOT, "_galleries", "#{slug}.md")
if File.exist?(gallery)
  puts "skip   _galleries/#{slug}.md (exists)"
else
  FileUtils.mkdir_p(File.dirname(gallery))
  File.write(gallery, <<~MD)
    ---
    title: #{q(title || slug.tr("-_", "  ").capitalize)}
    date: #{Date.today}
    description: ""
    cover: "01"
    ---
  MD
  puts "wrote  _galleries/#{slug}.md"
end
