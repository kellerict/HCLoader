# Platform listing fixtures (v0.10.0)

API answers of Mixcloud (GraphQL listing pages as queried by yt-dlp's `MixcloudUserIE` /
`MixcloudPlaylistIE` with HCLoader's extra node fields, and the public search API
`api.mixcloud.com/search/`) and hearthis.at (`api-v2.hearthis.at`: user tracks, sets, search).
Built from the response shapes these endpoints return (field names as yt-dlp's extractors and
the public API documentation use them); ids and texts are made up. Tests replay them through
the real yt-dlp extractor code with `_download_json` mocked – no network.
