import numpy as np
import matplotlib.pyplot as plt
import sys
import torch

def plot_in_3D(filter, ax=None):
    if ax == None:
        no_axis = True
    else:
        no_axis = False
    
    # Define the x, y coordinates for the surface plot
    x_len = filter.shape[0]
    y_len = filter.shape[1]
    x = np.arange(x_len)
    y = np.arange(y_len)
    X, Y = np.meshgrid(x, y)

    if no_axis:
        fig = plt.figure()
        ax = fig.add_subplot(111, projection='3d')

    # Plot the surface
    ax.plot_surface(X, Y, filter, cmap='coolwarm')

    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Filter Value')
    ax.set_title(f'{x_len}x{y_len} Filter')

    # Adjust the aspect ratio for better visualization if needed
    # ax.set_box_aspect([1, 1, 0.3])
    
    if no_axis:
        plt.show()
    

def normalize_tensor(tensor):
    tensor_min = tensor.min()
    tensor_max = tensor.max()
    tensor = (tensor - tensor_min) / (tensor_max - tensor_min)
    return tensor

def normalize_np_image(image):
    min_val = np.min(image)
    max_val = np.max(image)
    image = image - min_val
    image = image / (max_val - min_val)
    return image                                                                                                    
