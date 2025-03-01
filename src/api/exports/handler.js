const autoBind = require('auto-bind');

/* eslint-disable no-underscore-dangle */
class ExportsHandler {
  /**
   * @param {import('../../services/rabbitmq/ProducerService.js')} service
   * @param {import('../../validator/exports')} validator
   * @param {import('../../services/postgres/PlaylistsService.js')} playlistsService
   */
  constructor(service, validator, playlistsService) {
    this._service = service;
    this._validator = validator;
    this._playlistsService = playlistsService;

    autoBind(this);
  }

  async postExportPlaylistHandler(request, h) {
    this._validator.validateExportPlaylistPayload(request.payload);

    const { playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId);

    const message = {
      playlistId,
      targetEmail: request.payload.targetEmail,
    };

    await this._service.sendPlaylistMessage(
      'export:playlist',
      JSON.stringify(message),
    );

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda sedang kami proses',
    });

    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
