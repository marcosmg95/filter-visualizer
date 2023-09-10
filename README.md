# Filter visualizer

The filter visualizer offers a powerful tool for observing and debugging neural network weights. The 2D representation is available for each neuron in the chosen convolutional neural network layer and you can explore both the Fourier transform and the 3D representation of each neuron channel. This work was developed during my master thesis. A tutorial on how to use this application is shown on the `tutorial.ipynb` file. 

## How to run it
Execute the `filter_visualizer.py` file, for example, with `python filter_visualizer.py`.

## Requirements
This work has been mainly developed with PyTorch and Flask. The current artificial neural network used in the filter visualizer is AlexNet, pretrained on the ImageNet dataset. Future updates will introduce the flexibility to select different neural networks. However, for now, you can switch the neural network by modifying the `filter_visualizer.py` file.

## Example
![Example of the filter visualizer application](./filter_visualizer.jpg)
