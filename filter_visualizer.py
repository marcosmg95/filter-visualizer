from flask import Flask, render_template, request, make_response, jsonify, send_file
from flask_wtf import FlaskForm
from sklearn.decomposition import PCA
from wtforms import SubmitField
from io import BytesIO
import base64
import torch
import os
from PIL import Image, ImageDraw
import numpy as np
import sys
import torchvision
from torchvision import transforms
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Must be called before importing pyplot
import matplotlib.pyplot as plt
from utils import *
import scipy.signal
import cv2
import torch.nn.functional as F
from skimage import util
import scipy.ndimage
from utils import *
import torch.nn as nn
import torch.nn.functional as F

from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure


layer_index = 0
max_channels = 8
model = torch.hub.load('pytorch/vision:v0.10.0', 'alexnet', weights='AlexNet_Weights.DEFAULT')
model.eval()

def get_conv_layer(model, layer_index):
    # Get the list of layers
    # layers = list(model.children())
    # conv_layer = layers[layer_index]
    conv_layer = model.features[layer_index]
    return conv_layer

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

class PlotForm(FlaskForm):
    submit = SubmitField('Generate Plots')

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/layer_indexes', methods=['GET'])
def get_layer_indexes():
    try:
        layer_indexes = []
        
        # Get the list of layers
        layers = list(model.children())

        # for index, layer in enumerate(layers):
        for index, layer in enumerate(layers[0]):
            # Check if it is a convolution layer
            if isinstance(layer, nn.Conv2d):
                layer_indexes.append(index)
        
        return jsonify(layer_indexes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/num_weights', methods=['GET'])
def get_num_weights():
    try:
        layer_index = request.args.get('layer_index', default=0, type=int)
        conv_layer = get_conv_layer(model, layer_index)        
        return jsonify(conv_layer.weight.shape[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/num_channels', methods=['GET'])
def get_num_channels():
    try:
        layer_index = request.args.get('layer_index', default=0, type=int)
        conv_layer = get_conv_layer(model, layer_index)
        with torch.no_grad():
            weight = conv_layer.weight[0, :, :, :].cpu().numpy().transpose(1, 2, 0)
        
        return jsonify(weight.shape[2])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/weights', methods=['GET'])
def get_weights_surface():
    try:
        weight_index = request.args.get('index', default=0, type=int)
        layer_index = request.args.get('layer_index', default=0, type=int)
        fil_num_start = request.args.get('fil_num_start', default=0, type=int)
        
        layer_index = request.args.get('layer_index', default=0, type=int)
        conv_layer = get_conv_layer(model, layer_index)
        
        with torch.no_grad():
            weight = conv_layer.weight[weight_index, :, :, :].cpu().numpy()

        # Convert the weights to a list of dictionaries, converting to Python's native float type
        weight_dicts = []
        for channel in range(weight.shape[0]):
            if channel >= fil_num_start + max_channels:
                break
            
            if fil_num_start > channel:
                continue
            
            for x in range(weight.shape[1]):
                for y in range(weight.shape[2]):
                    weight_dicts.append({'x': x, 'y': y, 'channel': channel, 'weight': float(weight[channel][x][y])})

        return jsonify(weight_dicts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/weights_fft', methods=['GET'])
def get_weights_fft():
    try:
        weight_index = request.args.get('index', default=0, type=int)
        layer_index = request.args.get('layer_index', default=0, type=int)
        
        conv_layer = get_conv_layer(model, layer_index)
        
        with torch.no_grad():
            weight = conv_layer.weight[weight_index, :, :, :].cpu().numpy().transpose(1, 2, 0)
            
        fft_filter = np.fft.fftn(weight)

        # Get the magnitude spectrum
        magnitude_spectrum = np.abs(fft_filter)

        # Shift the zero-frequency component to the center of the spectrum
        magnitude_spectrum = np.fft.fftshift(magnitude_spectrum)
        
        # Create coordinates arrays
        x, y, z = np.mgrid[0:magnitude_spectrum.shape[0], 0:magnitude_spectrum.shape[1], 0:magnitude_spectrum.shape[2]]

        # Convert ndarrays to lists
        x_list = x.flatten().tolist()
        y_list = y.flatten().tolist()
        z_list = z.flatten().tolist()
        c_list = magnitude_spectrum.flatten().tolist()

        
        return jsonify({
            "x": x_list,
            "y": y_list,
            "z": z_list,
            "c": c_list
        })
    except Exception as e:
        return str(e), 500

@app.route('/weights_gray', methods=['GET'])
def get_weights_surface_gray():
    try:
        weight_index = request.args.get('index', default=0, type=int)
        layer_index = request.args.get('layer_index', default=0, type=int)
        
        conv_layer = get_conv_layer(model, layer_index)
        
        with torch.no_grad():
            weight = conv_layer.weight[weight_index, :, :, :].cpu().numpy().transpose(1, 2, 0)

        # Normalize weight to be in the range 0 to 255
        weight = (weight - np.min(weight)) / (np.max(weight) - np.min(weight))
        weight = weight * 255
        weight = weight.astype(np.uint8)
        
        if weight.shape[2] > 3:
            # Perform PCA to reduce the number of channels to 3 if needed
            pca = PCA(n_components=3)
            weight = pca.fit_transform(weight.reshape(-1, weight.shape[2])).reshape(weight.shape[0], weight.shape[1], 3)
        
        # Save this image to visualize it in the web brwoser
        plt.axis('off')
        plt.imshow(weight)  
        # plt.colorbar(im)  # if colorbar is needed
        
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        
        plt.close()

        return send_file(buf, mimetype='image/png')
    
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)