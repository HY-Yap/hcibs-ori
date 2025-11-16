import React, { useState } from "react";
import type { FC } from "react";
import {
  Box,
  Button,
  LinearProgress,
  Typography,
  IconButton,
  Alert,
  Paper,
} from "@mui/material";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";

interface FileUploadProps {
  uploadPath: string;
  onUploadComplete: (downloadUrl: string) => void;
}

export const FileUpload: FC<FileUploadProps> = ({
  uploadPath,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    let selectedFile = e.target.files[0];
    setError(null);
    setIsComplete(false);

    // Check if file is HEIC and convert to JPEG
    const isHeic = /\.heic$/i.test(selectedFile.name);
    if (isHeic) {
      setIsConverting(true);
      try {
        const heic2any = (await import("heic2any")).default;
        const convertedBlob = await heic2any({
          blob: selectedFile,
          toType: "image/jpeg",
          quality: 0.9,
        });
        // heic2any can return Blob or Blob[], handle both
        const blob = Array.isArray(convertedBlob)
          ? convertedBlob[0]
          : convertedBlob;
        // Create a new File object with .jpg extension
        selectedFile = new File(
          [blob],
          selectedFile.name.replace(/\.heic$/i, ".jpg"),
          { type: "image/jpeg" }
        );
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        setError("Failed to convert HEIC file. Please use JPEG or PNG.");
        setIsConverting(false);
        return;
      }
      setIsConverting(false);
    }

    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const storageRef = ref(storage, `${uploadPath}${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Update progress
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (err) => {
        // Handle error
        console.error("Upload failed:", err);
        setError("Upload failed. Please try again.");
        setIsUploading(false);
      },
      async () => {
        // Handle success
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onUploadComplete(downloadURL); // Send URL to parent
          setIsUploading(false);
          setIsComplete(true);
        } catch (err) {
          console.error("Failed to get download URL:", err);
          setError("Upload complete, but failed to get URL.");
          setIsUploading(false);
        }
      }
    );
  };

  const handleCancel = () => {
    setFile(null);
    setIsUploading(false);
    setIsComplete(false);
    setUploadProgress(0);
  };

  // If converting, show progress indicator
  if (isConverting) {
    return (
      <Box sx={{ width: "100%" }}>
        <LinearProgress />
        <Typography variant="caption" align="center" display="block">
          Converting HEIC to JPEG...
        </Typography>
      </Box>
    );
  }

  // If upload is complete, just show success
  if (isComplete) {
    return (
      <Alert
        severity="success"
        icon={<CheckCircleIcon />}
        action={
          <IconButton size="small" onClick={handleCancel}>
            <CloseIcon />
          </IconButton>
        }
      >
        Upload Complete!
      </Alert>
    );
  }

  // If a file is selected, show its name and upload/cancel buttons
  if (file && !isUploading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          bgcolor: "#f5f5f5",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.name}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton size="small" onClick={handleCancel}>
            <CloseIcon />
          </IconButton>
          <Button size="small" variant="contained" onClick={handleUpload}>
            Upload
          </Button>
        </Box>
      </Paper>
    );
  }

  // If currently uploading, show progress bar
  if (isUploading) {
    return (
      <Box sx={{ width: "100%" }}>
        <LinearProgress variant="determinate" value={uploadProgress} />
        <Typography variant="caption" align="center" display="block">
          Uploading... {Math.round(uploadProgress)}%
        </Typography>
      </Box>
    );
  }

  // Default state: Show the "Select File" button
  return (
    <Box>
      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        fullWidth
      >
        Select File
        <input
          type="file"
          hidden
          onChange={handleFileChange}
          // You can specify file types here, e.g.:
          // accept="image/png, image/jpeg, video/mp4"
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
