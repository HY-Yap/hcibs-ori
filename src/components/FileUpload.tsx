import React, { useState } from "react";
import type { FC } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  Alert,
} from "@mui/material";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import UploadFileIcon from "@mui/icons-material/UploadFile";

interface FileUploadProps {
  uploadPath: string;
  onUploadComplete: (downloadUrl: string) => void;
}

export const FileUpload: FC<FileUploadProps> = ({
  uploadPath,
  onUploadComplete,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `${uploadPath}${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (err) => {
          console.error("Upload failed:", err);
          setError("Upload failed. Please try again.");
          setIsUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onUploadComplete(downloadURL);
            setIsUploading(false);
            setUploadProgress(0);
          } catch (err) {
            console.error("Failed to get download URL:", err);
            setError("Upload complete, but failed to get URL.");
            setIsUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error("Upload setup failed:", err);
      setError("Failed to start upload.");
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    let file = e.target.files[0];
    setError(null);

    // Check if file is HEIC and convert to JPEG
    const isHeic = /\.heic$/i.test(file.name);
    if (isHeic) {
      setIsConverting(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const blob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
        file = new File(
          [blob],
          file.name.replace(/\.heic$/i, ".jpg"),
          { type: "image/jpeg" }
        );
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        setError("Failed to convert HEIC file. Using original.");
      } finally {
        setIsConverting(false);
      }
    }

    await uploadFile(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // If converting, show progress indicator
  if (isConverting) {
    return (
      <Box sx={{ width: "100%", my: 1 }}>
        <LinearProgress />
        <Typography variant="caption" align="center" display="block">
          Converting HEIC to JPEG...
        </Typography>
      </Box>
    );
  }

  // If currently uploading, show progress bar
  if (isUploading) {
    return (
      <Box sx={{ width: "100%", my: 1 }}>
        <LinearProgress variant="determinate" value={uploadProgress} />
        <Typography variant="caption" align="center" display="block">
          Uploading... {Math.round(uploadProgress)}%
        </Typography>
      </Box>
    );
  }

  // Default state: Show the "Add File" button
  return (
    <Box>
      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        fullWidth
        disabled={isUploading || isConverting}
      >
        Add File
        <input
          type="file"
          hidden
          onChange={handleFileChange}
        />
      </Button>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
