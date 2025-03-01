/* eslint-disable camelcase */
const mapAlbumToModel = ({
  id, name, year, created_at, updated_at, cover,
}) => ({
  id,
  name,
  year,
  createdAt: created_at,
  updatedAt: updated_at,
  coverUrl: cover,
});

const mapSongToModel = ({
  id,
  title,
  year,
  performer,
  genre,
  duration,
  album_id,
  created_at,
  updated_at,
}) => ({
  id,
  title,
  year,
  performer,
  genre,
  duration,
  albumId: album_id,
  createdAt: created_at,
  updatedAt: updated_at,
});

module.exports = { mapAlbumToModel, mapSongToModel };
