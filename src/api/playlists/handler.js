const autoBind = require('auto-bind');

/* eslint-disable no-underscore-dangle */
class PlaylistsHandler {
  /**
   * @param {import('../../services/postgres/PlaylistsService.js')} service
   * @param {import('../../validator/playlists')} validator
   */
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name = 'untitled' } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    const playlistId = await this._service.addPlaylist({
      name,
      owner: credentialId,
    });
    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._service.getPlaylists(credentialId);
    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    await this._service.deletePlaylistById(id);
    return h.response({
      status: 'success',
      message: 'Playlist berhasil dihapus',
    });
  }

  async postPlaylistSongHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    this._validator.validatePlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    const playlistSongId = await this._service.addSongToPlaylist(id, songId, credentialId);
    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan pada playlist',
      data: {
        playlistSongId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    const playlist = await this._service.getPlaylistSongsById(id, credentialId);
    return h.response({
      status: 'success',
      data: {
        playlist,
      },
    });
  }

  async deletePlaylistSongHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    this._validator.validatePlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    await this._service.deleteSongFromPlaylist(id, songId);
    return h.response({
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist',
    });
  }

  async getActivitiesHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._service.verifyPlaylistOwner(id, credentialId);
    const data = await this._service.getActivities(id, credentialId);
    return h.response({
      status: 'success',
      data,
    });
  }
}

module.exports = PlaylistsHandler;
