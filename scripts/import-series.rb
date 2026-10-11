#!/usr/bin/env ruby
# frozen_string_literal: true

# Turn a folder of original photos into a series: web-sized + thumbnail WebP in
# assets/photos/<slug>/, one editable stub per photo in _photos/<slug>/, and
# _series/<slug>.md if missing. Originals are only read. Never overwrites;
# running again on more photos continues the numbering.
#
#   mise exec -- bundle exec ruby scripts/import-series.rb <slug> <dir> [--title "Title"]
#
# Needs ImageMagick (`magick`); uses `exiftool` for the caption line if installed.

require "date"
require "fileutils"
require "json"
require "open3"

ROOT = File.expand_path("..", __dir__)
EXTS = %w[.jpg .jpeg .png .tif .tiff .webp].freeze
FULL = ["-resize", "2400x2400>", "-quality", "82"].freeze
THUMB = ["-resize", "640x640>", "-quality", "75"].freeze

def which?(cmd) = system("which #{cmd} > /dev/null 2>&1")

def q(value) = value.to_s.strip.empty? ? '""' : JSON.generate(value.to_s)

def exif(path)
  return {} unless which?("exiftool")

  out, status = Open3.capture2("exiftool", "-json", "-n", path)
  status.success? ? (JSON.parse(out).first || {}) : {}
end

def convert(src, dst, opts)
  system("magick", src, "-auto-orient", "-strip", *opts, dst) || abort("magick failed on #{src}")
end

args = ARGV.dup
title = (i = args.index("--title")) && args.slice!(i, 2).last
slug, dir = args
abort "usage: import-series.rb <slug> <dir> [--title \"Title\"]" unless slug && dir && File.directory?(dir)
abort "ImageMagick (magick) is required" unless which?("magick")

images = Dir.children(dir).select { |f| EXTS.include?(File.extname(f).downcase) }.sort
abort "no images found in #{dir}" if images.empty?

photos = File.join(ROOT, "_photos", slug)
assets = File.join(ROOT, "assets", "photos", slug)
FileUtils.mkdir_p([photos, assets])
n = Dir.children(photos).filter_map { |f| f[/\A(\d+)\.md\z/, 1]&.to_i }.max || 0

images.each do |file|
  nn = format("%02d", n += 1)
  full = File.join(assets, "#{nn}-full.webp")
  thumb = File.join(assets, "#{nn}-thumb.webp")
  md = File.join(photos, "#{nn}.md")
  next puts("skip   #{nn} (exists)") if [full, thumb, md].any? { |p| File.exist?(p) }

  src = File.join(dir, file)
  convert(src, full, FULL)
  convert(src, thumb, THUMB)
  w, h = `magick identify -format "%w %h" #{full}`.split.map(&:to_f)
  e = exif(src)
  shutter = e["ExposureTime"] && (e["ExposureTime"] < 1 ? "1/#{(1 / e["ExposureTime"]).round}" : e["ExposureTime"].to_s)
  lens = (e["LensModel"] || e["LensID"]).to_s[/\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?mm/i]&.downcase
  aperture = e["FNumber"] && "f/#{e["FNumber"].to_f.round(1).to_s.sub(/\.0\z/, "")}"
  taken = (e["DateTimeOriginal"] || e["CreateDate"])&.sub(/\A(\d+):(\d+):(\d+)/, '\1-\2-\3')

  File.write(md, <<~MD)
    ---
    series: #{slug}
    image: /assets/photos/#{slug}/#{nn}-full.webp
    thumb: /assets/photos/#{slug}/#{nn}-thumb.webp
    ratio: #{(w / h).round(3)}
    alt: ""
    note: ""
    camera: #{q(e["Model"])}
    lens: #{q(lens)}
    aperture: #{q(aperture)}
    shutter: #{q(shutter)}
    iso: #{q(e["ISO"])}
    captured_at: #{q(taken)}
    place: ""
    ---
  MD
  puts "wrote  _photos/#{slug}/#{nn}.md  (+ #{nn}-full.webp, #{nn}-thumb.webp)"
end

series = File.join(ROOT, "_series", "#{slug}.md")
if File.exist?(series)
  puts "skip   _series/#{slug}.md (exists)"
else
  FileUtils.mkdir_p(File.dirname(series))
  File.write(series, <<~MD)
    ---
    title: #{q(title || slug.tr("-_", "  ").capitalize)}
    date: #{Date.today}
    description: ""
    cover: "01"
    ---
  MD
  puts "wrote  _series/#{slug}.md"
end
