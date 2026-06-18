# Run on the server:  cd ~/apps/s4hs_sk/production && bin/rails runner /tmp/export.rb > /tmp/export.json
require "json"

def rich(rt)
  return nil if rt.nil? || rt.body.nil?
  embeds = rt.body.attachments.filter_map do |att|
    blob = att.attachable
    next unless blob.is_a?(ActiveStorage::Blob)
    { key: blob.key, filename: blob.filename.to_s, content_type: blob.content_type }
  end
  { html: rt.body.to_html, embeds: embeds }
end

def blob_ref(attached)
  return nil unless attached.attached?
  b = attached.blob
  { key: b.key, filename: b.filename.to_s, content_type: b.content_type }
end

data = {
  authors: User.order(:last_name).map do |u|
    {
      slug: u.slug, firstName: u.first_name, middleName: u.middle_name, lastName: u.last_name,
      titleBefore: u.title_before, titleAfter: u.title_after, email: u.email,
      website: u.website.presence || u.url.presence, facebook: u.facebook, linkedin: u.linkedin,
      createdAt: u.created_at.iso8601, avatar: blob_ref(u.avatar), bio: rich(u.bio)
    }
  end,
  posts: Post.order(created_at: :desc).map do |p|
    {
      slug: p.slug, title: p.title, authorSlug: p.author.slug, publishedAt: p.created_at.iso8601,
      image: blob_ref(p.image), description: rich(p.description), content: rich(p.content)
    }
  end,
  publications: Publication.order(created_at: :desc).map do |pub|
    {
      slug: pub.slug, title: pub.title, createdAt: pub.created_at.iso8601,
      image: blob_ref(pub.image),
      gallery: pub.gallery_images.map { |g| { key: g.blob.key, filename: g.blob.filename.to_s } },
      shortDescription: rich(pub.short_description), longDescription: rich(pub.long_description)
    }
  end
}

puts JSON.pretty_generate(data)
