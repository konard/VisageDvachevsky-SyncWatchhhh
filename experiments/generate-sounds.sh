#!/bin/bash

# Script to generate simple sound effects for the SyncWatch application
# Uses ffmpeg to create short, subtle audio files

SOUNDS_DIR="../frontend/public/sounds"

# Create sounds directory if it doesn't exist
mkdir -p "$SOUNDS_DIR"

echo "Generating sound effects..."

# Join room sound - Subtle chime (C major chord, 0.5s)
ffmpeg -f lavfi -i "sine=frequency=523.25:duration=0.5,sine=frequency=659.25:duration=0.5,sine=frequency=783.99:duration=0.5:amix=inputs=3" \
  -af "volume=0.3,afade=t=in:st=0:d=0.05,afade=t=out:st=0.4:d=0.1" \
  -y "$SOUNDS_DIR/join.mp3" 2>/dev/null

# Leave room sound - Soft descending tone (0.3s)
ffmpeg -f lavfi -i "sine=frequency=659.25:duration=0.15,sine=frequency=523.25:duration=0.15:concat=n=2:v=0:a=1" \
  -af "volume=0.25,afade=t=in:st=0:d=0.05,afade=t=out:st=0.25:d=0.05" \
  -y "$SOUNDS_DIR/leave.mp3" 2>/dev/null

# Message sound - Pop (short burst, 0.2s)
ffmpeg -f lavfi -i "sine=frequency=800:duration=0.2" \
  -af "volume=0.2,afade=t=in:st=0:d=0.02,afade=t=out:st=0.15:d=0.05" \
  -y "$SOUNDS_DIR/message.mp3" 2>/dev/null

# Click sound - Very subtle tap (0.1s)
ffmpeg -f lavfi -i "sine=frequency=1000:duration=0.1" \
  -af "volume=0.15,afade=t=in:st=0:d=0.01,afade=t=out:st=0.08:d=0.02" \
  -y "$SOUNDS_DIR/click.mp3" 2>/dev/null

# Mic on sound - Activation beep (0.2s)
ffmpeg -f lavfi -i "sine=frequency=600:duration=0.2" \
  -af "volume=0.25,afade=t=in:st=0:d=0.03,afade=t=out:st=0.15:d=0.05" \
  -y "$SOUNDS_DIR/mic-on.mp3" 2>/dev/null

# Mic off sound - Deactivation beep (0.2s, lower tone)
ffmpeg -f lavfi -i "sine=frequency=400:duration=0.2" \
  -af "volume=0.25,afade=t=in:st=0:d=0.03,afade=t=out:st=0.15:d=0.05" \
  -y "$SOUNDS_DIR/mic-off.mp3" 2>/dev/null

# Error sound - Soft alert (0.3s)
ffmpeg -f lavfi -i "sine=frequency=300:duration=0.3" \
  -af "volume=0.3,afade=t=in:st=0:d=0.05,afade=t=out:st=0.25:d=0.05" \
  -y "$SOUNDS_DIR/error.mp3" 2>/dev/null

echo "Sound effects generated successfully!"
echo "Files created in $SOUNDS_DIR/"
ls -lh "$SOUNDS_DIR/"
