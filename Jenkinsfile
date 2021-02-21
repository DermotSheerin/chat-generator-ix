pipeline {
    agent { dockerfile true }
    stages {
	    stage('Build') {
            steps {
                echo 'Building Image ....'
            }
        }
		
        stage('Test') {
            steps {
                sh 'node --version'
            }
        }
		
		stage('Deploy') {
            steps {
                sh 'docker run -it -d -p 8000:8000 f3273eb32e8138438091ed2a534682b55755a97f:latest'
            }
        }
    }
}