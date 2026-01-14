# ADR-0003: HLS for Video Delivery

## Status
Accepted

## Context
SyncWatch allows users to upload videos for synchronized playback across multiple clients. The video delivery system must:

- Support adaptive bitrate streaming for varying network conditions
- Work reliably across all modern browsers
- Enable precise seeking and timestamp synchronization
- Be cost-effective for storage and bandwidth
- Support future CDN integration

## Decision
We will use **HLS (HTTP Live Streaming)** with H.264 video codec for video delivery. Uploaded videos are transcoded to HLS format with multiple quality levels.

## Consequences

### Positive
- **Wide compatibility**: Supported natively in Safari, via hls.js in Chrome/Firefox
- **Adaptive streaming**: Clients automatically switch quality based on bandwidth
- **CDN-friendly**: Static .m3u8 and .ts files can be cached and served by any CDN
- **Precise seeking**: Segment-based seeking enables accurate synchronization
- **Standard format**: Well-documented, mature ecosystem
- **Cost-effective**: Simple HTTP delivery, no special streaming server needed

### Negative
- **Transcoding cost**: All videos must be transcoded to HLS (CPU/time intensive)
- **Storage overhead**: Multiple quality levels increase storage by 3-5x
- **Latency**: ~6-30 second delay from source (not suitable for live streaming)
- **Startup time**: Manifest download + first segments = 1-3 second initial delay

### Risks
- **Transcoding queue**: Large videos can take minutes to process, blocking playback
- **Codec patents**: H.264 requires licensing (free for streaming, paid for encoding at scale)
- **Format migration**: Changing to DASH or other formats later requires re-transcoding all videos

## Alternatives Considered

### Alternative 1: DASH (Dynamic Adaptive Streaming over HTTP)
- **Pros**: More flexible, codec-agnostic, royalty-free
- **Cons**: No native Safari support, requires Media Source Extensions everywhere
- **Verdict**: HLS simpler and has better browser support

### Alternative 2: Progressive MP4 download
- **Pros**: Simple, no transcoding, universal support
- **Cons**: No adaptive bitrate, wastes bandwidth, poor seeking, large file sizes
- **Verdict**: Unacceptable UX for poor network conditions

### Alternative 3: WebRTC video streaming
- **Pros**: Ultra-low latency, P2P possible
- **Cons**: Not designed for file playback, complex, no adaptive bitrate, no seeking
- **Verdict**: Wrong tool for video file synchronization

### Alternative 4: YouTube embed only
- **Pros**: Zero infrastructure cost, no transcoding
- **Cons**: Depends on third-party, limited to YouTube content, sync quality varies
- **Verdict**: Already supported as alternative source, not sufficient for uploaded videos

## Implementation Details
- **Transcoding**: FFmpeg via BullMQ job queue
- **Quality levels**: 360p, 480p, 720p (adaptive)
- **Segment duration**: 4 seconds (balance between seek precision and overhead)
- **Storage**: MinIO (S3-compatible)
- **Player**: hls.js for Chrome/Firefox, native for Safari

## References
- [HLS Specification (RFC 8216)](https://datatracker.ietf.org/doc/html/rfc8216)
- [hls.js Documentation](https://github.com/video-dev/hls.js/)
- [FFmpeg HLS Guide](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- Technical Specification Section 7.3: Video Transcoding
- backend/src/modules/videos/service.ts
- transcoder/src/index.ts
