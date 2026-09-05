const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL ||
  "http://localhost:8000";

const processTextWithML = async (text) => {
  if (!text || !text.trim()) {
    throw new Error(
      "Text is required for ML processing."
    );
  }

  const response = await fetch(
    `${ML_SERVICE_URL}/process`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        text: text.trim(),
      }),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "ML service returned an invalid response."
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.detail ||
        data.message ||
        "ML service processing failed."
    );
  }

  return data;
};

const checkMLServiceHealth = async () => {
  const response = await fetch(
    `${ML_SERVICE_URL}/health`
  );

  if (!response.ok) {
    throw new Error(
      "ML service health check failed."
    );
  }

  return response.json();
};

export {
  processTextWithML,
  checkMLServiceHealth,
};