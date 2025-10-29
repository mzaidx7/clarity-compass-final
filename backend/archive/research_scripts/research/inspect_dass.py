import pandas as pd

# Load the dataset

df = pd.read_csv('data/dass21/dass21.csv')

# Show info
print('\nColumns in dataset:')
print(df.columns.tolist())

print('\nFirst 5 rows:')
print(df.head())

print('\nData types:')
print(df.dtypes)

print('\nTotal rows:', len(df))

# Run: python research/inspect_dass.py
