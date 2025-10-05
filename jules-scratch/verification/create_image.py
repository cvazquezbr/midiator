import png

# Create a 1x1 red pixel image
width = 1
height = 1
img = []
row = (255, 0, 0)  # Red pixel (R, G, B)
img.append(row)

# Write the image to a file
with open('jules-scratch/verification/sample.png', 'wb') as f:
    writer = png.Writer(width, height, greyscale=False)
    writer.write(f, img)

print("Sample image created at jules-scratch/verification/sample.png")