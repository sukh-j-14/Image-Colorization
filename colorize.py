import numpy as np
import cv2

# Load the model architecture and weights
prototxt_path = 'colorization_deploy_v2.prototxt'
model_path = 'colorization_release_v2.caffemodel'
net = cv2.dnn.readNetFromCaffe(prototxt_path, model_path)

# Load the cluster centers
pts_in_hull = np.load('pts_in_hull.npy')

# Add the cluster centers as 1x1 convolutions to the model
class8 = net.getLayerId("class8_ab")
conv8 = net.getLayerId("conv8_313_rh")
pts_in_hull = pts_in_hull.transpose().reshape(2, 313, 1, 1)
net.getLayer(class8).blobs = [pts_in_hull.astype(np.float32)]
net.getLayer(conv8).blobs = [np.full([1, 313], 2.606, dtype=np.float32)]

# Load the input image
input_image_path = 'input_bw.jpg'  # Replace with your image path
image = cv2.imread(input_image_path)

# Normalize the image
normalized = image.astype(np.float32) / 255.0

# Convert the image to Lab color space
lab = cv2.cvtColor(normalized, cv2.COLOR_BGR2LAB)

# Resize the image to the input size of the network
resized = cv2.resize(lab, (224, 224))

# Extract the L channel (lightness)
L = cv2.split(resized)[0]
L -= 50  # Subtract 50 for mean-centering

# Set the input to the network
net.setInput(cv2.dnn.blobFromImage(L))

# Perform forward pass to get the predicted 'a' and 'b' channels
ab = net.forward()[0, :, :, :].transpose((1, 2, 0))

# Resize the predicted 'ab' channels to the original image size
ab = cv2.resize(ab, (image.shape[1], image.shape[0]))

# Concatenate the L channel with the predicted 'ab' channels
L = cv2.split(lab)[0]
colorized = np.concatenate((L[:, :, np.newaxis], ab), axis=2)

# Convert the image back to BGR color space
colorized = cv2.cvtColor(colorized, cv2.COLOR_LAB2BGR)
colorized = (255.0 * colorized).astype(np.uint8)

# Display the original and colorized images
cv2.imshow("Original", image)
cv2.imshow("Colorized", colorized)
cv2.waitKey(0)
cv2.destroyAllWindows()

# Save the colorized image
cv2.imwrite('colorized_image.jpg', colorized)